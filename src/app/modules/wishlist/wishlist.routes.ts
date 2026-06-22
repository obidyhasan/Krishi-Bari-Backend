import { Router } from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import { WishlistController } from "./wishlist.controller";

const router = Router();
const CUSTOMER = auth(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN);

router.get("/", CUSTOMER, WishlistController.getWishlist);
router.post("/toggle", CUSTOMER, WishlistController.toggleWishlist);
router.post("/:productId", CUSTOMER, WishlistController.toggleWishlist);
router.delete("/:productId", CUSTOMER, WishlistController.removeFromWishlist);
router.post("/:productId/move-to-cart", CUSTOMER, WishlistController.moveToCart);
router.post("/:productId/notify", CUSTOMER, WishlistController.toggleNotifyMe);
router.patch("/:productId/notify-stock", CUSTOMER, WishlistController.toggleNotifyMe);

export const WishlistRouter = router;
