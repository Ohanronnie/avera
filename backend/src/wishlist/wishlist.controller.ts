import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WishlistService } from './wishlist.service';
import { CurrentUser } from 'src/auth/current-user.decorator';

@Controller('wishlist')
@UseGuards(AuthGuard('jwt'))
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  getWishlist(@CurrentUser('userId') userId: number) {
    return this.wishlistService.getWishlist(userId);
  }

  @Get('ids')
  getWishlistProductIds(@CurrentUser('userId') userId: number) {
    return this.wishlistService.getWishlistProductIds(userId);
  }

  @Get(':productId/status')
  getWishlistStatus(
    @CurrentUser('userId') userId: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.wishlistService.getWishlistStatus(userId, productId);
  }

  @Post(':productId')
  addToWishlist(
    @CurrentUser('userId') userId: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.wishlistService.addToWishlist(userId, productId);
  }

  @Delete(':productId')
  removeFromWishlist(
    @CurrentUser('userId') userId: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.wishlistService.removeFromWishlist(userId, productId);
  }
}
