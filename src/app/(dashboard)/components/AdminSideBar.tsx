"use client";
import React, { LegacyRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Person2 } from "@mui/icons-material";

interface adminSideBarProps {
  domNode?: LegacyRef<HTMLDivElement>;
  sideBarToggle: boolean;
  screenSize: number;
  setSideBarToggle: (arg: boolean) => void;
}

const AdminSideBar = ({
  domNode,
  sideBarToggle,
  screenSize,
  setSideBarToggle,
}: adminSideBarProps) => {
  const pathname = usePathname();
  const open = "absolute z-10 left-0 ";
  const hide = " absolute -left-full z-10";

  const handleCloseSideBar = () => {
    if (sideBarToggle !== undefined && screenSize <= 1024) {
      setSideBarToggle(false);
    }
  };

  return (
    <div
      ref={domNode}
      className={`${
        screenSize <= 1024 ? (sideBarToggle ? open : hide) : ""
      } w-3/4 lg:w-80 h-screen shadow overflow-auto bg-pri 
       flex-1 border-r border-gray-800 dark:bg-pri-dark
         text-sec dark:text-pri`}
    >
      <div className="p-2">
        <Link href={"/"}>
          <Image
            title="logo"
            src="/logo.png"
            width={60}
            height={40}
            alt="logo"
            className=" w-auto h-auto"
          />
        </Link>
      </div>
      <div>
        <ul
          className="flex flex-col gap-2 p-2 
        font-semibold text-gray-600"
        >
          <li>
            <h3 className="text-sm">DashBoard</h3>
            <ul className="flex flex-col gap-1 p-1">
              <Link
                href={"/admin"}
                onClick={handleCloseSideBar}
                className={
                  pathname === "/admin" ? "activeLink" : "inactiveLink"
                }
              >
                <li>Overview</li>
              </Link>
              <Link
                href={"/admin/reports"}
                onClick={handleCloseSideBar}
                className={
                  pathname === "/admin/reports" ? "activeLink" : "inactiveLink"
                }
              >
                <li>Reports</li>
              </Link>
            </ul>
          </li>

          <li>
            <h3 className="text-sm">Products</h3>
            <ul className="flex flex-col gap-1 p-1">
              <Link
                href={"/admin/products/products_list"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/products/products_list")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>All Products</li>
              </Link>
              <Link
                href={"/admin/products/list_product"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/products/list_product")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>List Product</li>
              </Link>
              <Link
                href={"/admin/categories"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/categories")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Categories & Subcategories</li>
              </Link>
              <Link
                href={"/admin/brands"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/brands")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Brands</li>
              </Link>
              <Link
                href={"/admin/attributes"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/attributes")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Attributes & Tags</li>
              </Link>
            </ul>
          </li>

          <li>
            <h3 className="text-sm">Orders</h3>
            <ul className="flex flex-col gap-1 p-1">
              <Link
                href={"/admin/orders"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/orders")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>All Orders</li>
              </Link>
              <Link
                href={"/admin/pending_orders"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/pending_orders")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Pending Orders</li>
              </Link>
              <Link
                href={"/admin/shipped_orders"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/shipped_orders")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Shipped Orders</li>
              </Link>
              <Link
                href={"/admin/completed_orders"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/completed_orders")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Completed Orders</li>
              </Link>
              <Link
                href={"/admin/returns"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/returns")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Returns</li>
              </Link>
            </ul>
          </li>

          <li>
            <h3 className="text-sm">Shipping</h3>
            <ul className="flex flex-col gap-1 p-1">
              <Link
                href={"/admin/shipping"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/shipping")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Overview</li>
              </Link>
              <Link
                href={"/admin/manage_shipping"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/manage_shipping")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Manage Shipping</li>
              </Link>
            </ul>
          </li>

          <li>
            <h3 className="text-sm">Customers</h3>
            <ul className="flex flex-col gap-1 p-1">
              <Link
                href={"/admin/customers"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/customers")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>All Customers</li>
              </Link>
              <Link
                href={"/admin/customer_groups"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/customer_groups")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Customer Groups</li>
              </Link>
            </ul>
          </li>
          <li>
            <h3 className="text-sm">Marketing</h3>
            <ul className="flex flex-col gap-1 p-1">
              <Link
                href={"/admin/discounts_coupons"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/discounts_coupons")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Discounts & Coupons</li>
              </Link>
              <Link
                href={"/admin/email_marketing"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/email_marketing")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Email Marketing</li>
              </Link>
              <Link
                href={"/admin/ads_management"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/ads_management")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Ads Management</li>
              </Link>
            </ul>
          </li>
          <li>
            <h3 className="text-sm">Content Management</h3>
            <ul className="flex flex-col gap-1 p-1">
              <Link
                href={"/admin/blogs"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/blogs")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Blogs</li>
              </Link>
              <Link
                href={"/admin/reviews_ratings"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/reviews_ratings")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Reviews & Ratings</li>
              </Link>
              <Link
                href={"/admin/content_management/banner_sliders"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/content_management/banners_sliders")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Banners & Sliders</li>
              </Link>
            </ul>
          </li>
          <li>
            <h3 className="text-sm">Users</h3>
            <ul className="flex flex-col gap-1 p-1">
              <Link
                href={"/admin/users"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/users")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li className="flex items-center gap-2">
                  <Person2 /> <p>Admin Users</p>
                </li>
              </Link>
              <Link
                href={"/admin/permissions_roles"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/permissions_roles")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li className="flex items-center gap-2">
                  <p>Permissions & Roles</p>
                </li>
              </Link>
            </ul>
          </li>
          <li>
            <h3 className="text-sm">Analytics</h3>
            <ul className="flex flex-col gap-1 p-1">
              <Link
                href={"/admin/sales_analytics"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/sales_analytics")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li className="flex items-center gap-2">
                  <p>Sales Analytics</p>
                </li>
              </Link>
              <Link
                href={"/admin/product_analytics"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/product_analytics")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li className="flex items-center gap-2">
                  <p>Product Analytics</p>
                </li>
              </Link>
              <Link
                href={"/admin/customer_analytics"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/customer_analytics")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li className="flex items-center gap-2">
                  <p>Customer Analytics</p>
                </li>
              </Link>
            </ul>
          </li>
          <li>
            <h3 className="text-sm">Settings</h3>
            <ul className="flex flex-col gap-1 p-1">
              <Link
                href={"/admin/general_settings"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/general_settings")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>General Settings</li>
              </Link>
              <Link
                href={"/admin/payment_methods"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/payment_methods")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Payment Methods</li>
              </Link>
              <Link
                href={"/admin/shipping_methods"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/shipping_methods")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Shipping Methods</li>
              </Link>
              <Link
                href={"/admin/tax_settings"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/tax_settings")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Tax Settings</li>
              </Link>
            </ul>
          </li>
          <li>
            <h3 className="text-sm">System Logs</h3>
            <ul className="flex flex-col gap-1 p-1">
              <Link
                href={"/admin/activity_logs"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/activity_logs")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Activity Logs</li>
              </Link>
              <Link
                href={"/admin/error_logs"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/admin/error_logs")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Error Logs</li>
              </Link>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AdminSideBar;
