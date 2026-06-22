import { Router } from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ReviewController } from "./review.controller";
import { ReviewValidation } from "./review.validation";

const router = Router();
const CUSTOMER = auth(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN);
const ADMIN = auth(UserRole.ADMIN, UserRole.SUPER_ADMIN);

router.get("/product/:productId", ReviewController.getProductReviews);
router.post("/", CUSTOMER, validateRequest(ReviewValidation.createReview), ReviewController.createReview);
router.patch("/:id", CUSTOMER, validateRequest(ReviewValidation.updateReview), ReviewController.updateReview);
router.delete("/:id", CUSTOMER, ReviewController.deleteReview);
router.delete("/admin/:id", ADMIN, ReviewController.adminDeleteReview);
router.patch("/admin/:id/approve", ADMIN, ReviewController.approveReview);

export const ReviewRouter = router;
