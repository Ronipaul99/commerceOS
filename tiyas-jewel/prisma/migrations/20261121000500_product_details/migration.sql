-- Optional catalog facts for the shared product card and product information.
ALTER TABLE "Product" ADD COLUMN "details" JSONB;
ALTER TABLE "Product" ADD CONSTRAINT "Product_details_object_check"
  CHECK ("details" IS NULL OR jsonb_typeof("details") = 'object');
