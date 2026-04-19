import {
  Body,
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { GetProductsDto } from './dto/get-products.dto';
import { AuthGuard } from '@nestjs/passport';
import { CreateProductDto } from './dto/create-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('/create')
  createProduct(@Body() body: CreateProductDto, @Req() req: any) {
    const user = req.user.userId;
    return this.productsService.createProduct(user, body)
  }
  
  @Get()
  getProducts(@Query() query: GetProductsDto) {
    return this.productsService.getProducts(query);
  }
  
  @Get("/search/suggestions")
  getSearchSuggestions(@Query('q') query: string, @Query("categoryId") categoryId: number) {
    return this.productsService.getSearchSuggestions(query, categoryId);
  }
}
