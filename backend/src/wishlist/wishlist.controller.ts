import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WishlistService } from './wishlist.service';

@Controller('wishlist')
@UseGuards(AuthGuard('jwt'))
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  getWishlist(@Req() req: any) {
    return this.wishlistService.getWishlist(req.user.userId);
  }

  @Get('ids')
  getWishlistProductIds(@Req() req: any) {
    return this.wishlistService.getWishlistProductIds(req.user.userId);
  }

  @Get(':productId/status')
  getWishlistStatus(
    @Req() req: any,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.wishlistService.getWishlistStatus(req.user.userId, productId);
  }

  @Post(':productId')
  addToWishlist(
    @Req() req: any,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.wishlistService.addToWishlist(req.user.userId, productId);
  }

  @Delete(':productId')
  removeFromWishlist(
    @Req() req: any,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.wishlistService.removeFromWishlist(req.user.userId, productId);
  }
}
