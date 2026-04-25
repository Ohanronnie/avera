import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { GetProductsDto } from './dto/get-products.dto';
import { AuthGuard } from '@nestjs/passport';
import { CreateProductDto } from './dto/create-product.dto';
import { OptionalJwtAuthGuard } from 'src/auth/optional-jwt-auth.guard';
import { RecordSearchKeywordDto } from './dto/record-search-keyword.dto';
import { CurrentUser } from 'src/auth/current-user.decorator';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('/create')
  createProduct(
    @Body() body: CreateProductDto,
    @CurrentUser('userId') userId: number,
  ) {
    return this.productsService.createProduct(userId, body);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  getProducts(
    @Query() query: GetProductsDto,
    @CurrentUser('userId') userId?: number,
  ) {
    return this.productsService.getProducts(query, userId);
  }

  @Get('/search/suggestions')
  getSearchSuggestions(
    @Query('q') query: string,
    @Query('categoryId') categoryId: number,
  ) {
    return this.productsService.getSearchSuggestions(query, categoryId);
  }

  @Get('/trending-keywords')
  getTrendingKeywords(@Query('limit') limit?: string) {
    return this.productsService.getTrendingKeywords(Number(limit || 8));
  }

  @Post('/search-events')
  recordSearchKeyword(@Body() body: RecordSearchKeywordDto) {
    return this.productsService.recordSearchKeyword(body.query);
  }
}
