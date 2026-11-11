// MenuPage.tsx
import { MobileDrawer } from "@/components/MobileDrawer";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import { useUserRole } from "@/context/UserRoleContext";   // ⬅️ add

export default function MenuPage() {
    const navigate = useNavigate();
    const skipBack = useRef(false);
    const { role } = useUserRole();     // ⬅️ read from context

    return (
        <MobileDrawer
            userRole={role as "student" | "tutor" | "staff"}   // ⬅️ pass it
            isOpen={true}
            setIsOpen={(open) => {
                if (open) return;
                if (skipBack.current) {
                    skipBack.current = false;
                    return;
                }
                navigate(-1);
            }}
            onInternalNavigate={() => { skipBack.current = true; }}
        />
    );
}