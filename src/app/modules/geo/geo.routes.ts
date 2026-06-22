import express from "express";
import { GeoController } from "./geo.controller";

const router = express.Router();

router.get("/divisions", GeoController.getDivisions);
router.get("/districts", GeoController.getDistricts);
router.get("/upazilas", GeoController.getUpazilas);

export const GeoRouter = router;
