import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: QueryProductsDto) {
    return this.productsService.findAll(query);
  }

  @Get('categories')
  findCategories() {
    return this.productsService.findCategories();
  }

  @Get('price-range')
  findPriceRange() {
    return this.productsService.findPriceRange();
  }

  @Get(':idOrSlug')
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.productsService.findOne(idOrSlug);
  }

  @Post(':idOrSlug/reviews')
  createReview(@Param('idOrSlug') idOrSlug: string, @Body() dto: CreateReviewDto) {
    return this.productsService.createReview(idOrSlug, dto);
  }
}
