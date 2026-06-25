import { Router } from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { FaqController } from "./faq.controller";
import { FaqValidation } from "./faq.validation";

const publicRouter = Router();
const adminRouter = Router();
const ADMIN = auth(UserRole.ADMIN, UserRole.SUPER_ADMIN);

publicRouter.get("/", FaqController.getPublishedFaqs);

adminRouter.use(ADMIN);
adminRouter.get("/", FaqController.getAllFaqs);
adminRouter.get("/:id", FaqController.getFaqById);
adminRouter.post(
  "/",
  validateRequest(FaqValidation.createFaq),
  FaqController.createFaq,
);
adminRouter.patch(
  "/:id",
  validateRequest(FaqValidation.updateFaq),
  FaqController.updateFaq,
);
adminRouter.patch("/:id/toggle-publish", FaqController.togglePublish);
adminRouter.delete("/:id", FaqController.deleteFaq);

export const FaqRouter = publicRouter;
export const AdminFaqRouter = adminRouter;
