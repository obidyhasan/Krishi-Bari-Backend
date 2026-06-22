import { Router } from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import { imageUpload } from "../../middlewares/upload";
import validateRequest from "../../middlewares/validateRequest";
import { CategoryController } from "./category.controller";
import { CategoryValidation } from "./category.validation";

const router = Router();

router.get("/", CategoryController.getAllCategories);
router.get("/:slug", CategoryController.getCategoryBySlug);
router.post("/", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), imageUpload.single("image"), validateRequest(CategoryValidation.create), CategoryController.createCategory);
router.patch("/:id", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), imageUpload.single("image"), validateRequest(CategoryValidation.update), CategoryController.updateCategory);
router.delete("/:id", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), CategoryController.deleteCategory);
router.post("/reorder", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), CategoryController.reorderCategories);

export const CategoryRouter = router;
