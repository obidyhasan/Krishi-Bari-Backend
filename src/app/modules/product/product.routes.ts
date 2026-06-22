import { Router } from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import { imageUpload } from "../../middlewares/upload";
import validateRequest from "../../middlewares/validateRequest";
import { ProductController } from "./product.controller";
import { ProductValidation } from "./product.validation";

const router = Router();

router.get("/", ProductController.getAllProducts);
router.get("/search", ProductController.getAllProducts);
router.get("/autocomplete", ProductController.autocomplete);
router.get("/featured", ProductController.getFeaturedProducts);
router.get("/:slug", ProductController.getProductBySlug);
router.post("/", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), imageUpload.array("images", 8), validateRequest(ProductValidation.create), ProductController.createProduct);
router.patch("/:id", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), validateRequest(ProductValidation.update), ProductController.updateProduct);
router.delete("/:id", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), ProductController.deleteProduct);
router.post("/bulk-import", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), ProductController.bulkImport);
router.post("/:id/images", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), imageUpload.array("images", 8), ProductController.addProductImages);
router.delete("/:id/images/:imageId", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), ProductController.deleteProductImage);
router.patch("/reorder-images", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), ProductController.reorderProductImages);

export const ProductRouter = router;
