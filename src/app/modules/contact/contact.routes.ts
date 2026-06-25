import { Router } from "express";
import validateRequest from "../../middlewares/validateRequest";
import { ContactController } from "./contact.controller";
import { ContactValidation } from "./contact.validation";

const router = Router();

router.post(
  "/",
  validateRequest(ContactValidation.submitContact),
  ContactController.submitContact,
);

export const ContactRouter = router;
