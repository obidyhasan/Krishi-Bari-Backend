import { Router } from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { AddressController } from "./address.controller";
import { AddressValidation } from "./address.validation";

const router = Router();
const CUSTOMER = auth(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN);

router.get("/", CUSTOMER, AddressController.getAddresses);
router.post("/", CUSTOMER, validateRequest(AddressValidation.createAddress), AddressController.createAddress);
router.patch("/:id", CUSTOMER, validateRequest(AddressValidation.updateAddress), AddressController.updateAddress);
router.delete("/:id", CUSTOMER, AddressController.deleteAddress);
router.patch("/:id/set-default", CUSTOMER, AddressController.setDefaultAddress);

export const AddressRouter = router;
