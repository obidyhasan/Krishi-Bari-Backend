import { Router } from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import { imageUpload } from "../../middlewares/upload";
import validateRequest from "../../middlewares/validateRequest";
import { ProductController } from "./product.controller";
import { ProductValidation } from "./product.validation";

const router = Router();
const ADMIN = auth(UserRole.ADMIN, UserRole.SUPER_ADMIN);

router.post(
  "/",
  ADMIN,
  imageUpload.array("images", 8),
  validateRequest(ProductValidation.create),
  ProductController.createProduct,
);
router.get("/:id", ADMIN, ProductController.getProductById);
router.put(
  "/:id",
  ADMIN,
  validateRequest(ProductValidation.update),
  ProductController.updateProduct,
);
router.delete("/:id", ADMIN, ProductController.deleteProduct);
router.post("/bulk-import", ADMIN, ProductController.bulkImport);
router.post("/reorder-images", ADMIN, ProductController.reorderProductImages);
router.patch(
  "/:id/images",
  ADMIN,
  imageUpload.array("images", 8),
  ProductController.addProductImages,
);
router.delete(
  "/:id/images/:imageId",
  ADMIN,
  ProductController.deleteProductImage,
);

export const AdminProductRouter = router;
