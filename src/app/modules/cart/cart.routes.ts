import { Router } from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { CartController } from "./cart.controller";
import { CartValidation } from "./cart.validation";

const router = Router();
const CUSTOMER = auth(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN);

router.get("/", CUSTOMER, CartController.getCart);
router.post("/items", CUSTOMER, validateRequest(CartValidation.addItem), CartController.addItem);
router.post("/merge", CUSTOMER, validateRequest(CartValidation.mergeCart), CartController.mergeCart);
router.put("/sync", CUSTOMER, validateRequest(CartValidation.syncCart), CartController.syncCart);
router.patch("/items/:itemId", CUSTOMER, validateRequest(CartValidation.updateItem), CartController.updateItem);
router.delete("/items/:itemId", CUSTOMER, CartController.removeItem);
router.delete("/", CUSTOMER, CartController.clearCart);

export const CartRouter = router;
