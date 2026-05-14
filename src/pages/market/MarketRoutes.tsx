"use client";
import { Outlet } from "react-router-dom";
const MarketRoutes = ({ user, profile }: { user: any; profile: any }) => {
    return <Outlet context={{ user, profile }} />;
};
export default MarketRoutes;