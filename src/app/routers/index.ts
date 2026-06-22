import { Router } from "express";
import { AuthRouter } from "../modules/auth/auth.routes";
import { UserRouter } from "../modules/user/user.routes";
import { CategoryRouter } from "../modules/category/category.routes";
import { ProductRouter } from "../modules/product/product.routes";
import { CartRouter } from "../modules/cart/cart.routes";
import { OrderRouter } from "../modules/order/order.routes";
import { PaymentRouter } from "../modules/payment/payment.routes";
import { ReviewRouter } from "../modules/review/review.routes";
import { CouponRouter } from "../modules/coupon/coupon.routes";
import { WishlistRouter } from "../modules/wishlist/wishlist.routes";
import { NotificationRouter } from "../modules/notification/notification.routes";
import { AddressRouter } from "../modules/address/address.routes";
import { GeoRouter } from "../modules/geo/geo.routes";
import { AdminRouter } from "../modules/admin/admin.routes";
import { AdminAuthRouter } from "../modules/admin/adminAuth.routes";
import { AdminOrderRouter } from "../modules/order/adminOrder.routes";
import { AdminProductRouter } from "../modules/product/adminProduct.routes";
import { TrackingRouter } from "../modules/tracking/tracking.routes";


import { SettingRouter } from "../modules/setting/setting.routes";
import ipAllowlist from "../middlewares/ipAllowlist";
import { auditLogger } from "../middlewares/auditLogger";

const router = Router();

const moduleRouters = [
  { path: "/auth", route: AuthRouter },
  { path: "/users", route: UserRouter },
  { path: "/categories", route: CategoryRouter },
  { path: "/admin/categories", route: CategoryRouter },
  { path: "/products", route: ProductRouter },
  { path: "/cart", route: CartRouter },
  { path: "/orders", route: OrderRouter },
  { path: "/payments", route: PaymentRouter },
  { path: "/reviews", route: ReviewRouter },
  { path: "/coupons", route: CouponRouter },
  { path: "/admin/coupons", route: CouponRouter },
  { path: "/wishlist", route: WishlistRouter },
  { path: "/notifications", route: NotificationRouter },
  { path: "/addresses", route: AddressRouter },
  { path: "/geo", route: GeoRouter },
  { path: "/settings", route: SettingRouter },
  { path: "/admin", route: AdminRouter },
  { path: "/admin/auth", route: AdminAuthRouter },
  { path: "/admin/orders", route: AdminOrderRouter },
  { path: "/admin/products", route: AdminProductRouter },
  { path: "/tracking", route: TrackingRouter },
];

moduleRouters.forEach((route) => {
  if (route.path.startsWith("/admin") && route.path !== "/admin/auth") {
    router.use(route.path, ipAllowlist, auditLogger(), route.route);
  } else {
    router.use(route.path, route.route);
  }
});

export default router;
