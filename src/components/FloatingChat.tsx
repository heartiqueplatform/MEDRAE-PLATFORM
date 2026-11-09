// src/components/FloatingChat.tsx
"use client";
import { useEffect, useState } from "react";
import { useSession } from "@supabase/auth-helpers-react";
import FloatingChatShell, { type DesktopChatMode } from "./FloatingChatShell";
import { useChatData } from "./chatroom/chatHooks";
import ChatListPanel from "./chatroom/ChatListPanel";
import ChatRoomPanel from "./chatroom/ChatRoomPanel";
import ChatActionSheet from "./chatroom/ChatActionSheet";
import UnitInfoPanel from "./chatroom/UnitInfoPanel";
import ResizeHandle from "./chatroom/ResizeHandle";
import { Unit } from "./chatroom/types";

interface FloatingChatProps {
  currentUserId: string;
  isOpen?: boolean;
  onClose?: () => void;
}

const INFO_MIN = 180;
const INFO_MAX = 400;
const INFO_DEFAULT = 260;

export default function FloatingChat({ currentUserId: propUserId, isOpen = true, onClose }: FloatingChatProps) {
  const session = useSession();
  const currentUserId = propUserId || session?.user?.id;

  const [desktopMode, setDesktopMode] = useState<DesktopChatMode>(() => {
    if (typeof window === "undefined") return "fullscreen";
    return (localStorage.getItem("chat_desktop_mode") as DesktopChatMode) || "fullscreen";
  });

  const [rightWidth, setRightWidth] = useState<number>(() => {
    if (typeof window === "undefined") return INFO_DEFAULT;
    const saved = localStorage.getItem("chat_info_width");
    if (saved === "0") return 0;
    const n = saved ? parseInt(saved) : NaN;
    if (Number.isFinite(n) && n >= INFO_MIN && n <= INFO_MAX) return n;
    return INFO_DEFAULT;
  });

  const [actionSheetUnit, setActionSheetUnit] = useState<Unit | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("chat_desktop_mode", desktopMode);
  }, [desktopMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("chat_info_width", String(rightWidth));
  }, [rightWidth]);

  const data = useChatData(currentUserId);

  const activeUnitData = data.userUnits.find((u) => u.unit_code === data.activeUnit);
  const activeMessages = data.activeUnit ? (data.messagesMap[data.activeUnit] || []) : [];

  const collapsed = rightWidth === 0;

  // ── Which panes render? ──────────────────────────────────────
  // Fullscreen (any device):
  //   List    → always (desktop) / when activeScreen==="list" (phone)
  //   Chat    → always (desktop) / when activeScreen==="chat" (phone)
  //   Info    → desktop only
  //
  // Floating (desktop minimize):
  //   Show ONE pane at a time — mirrors the phone behavior, in a bubble.
  const isFullscreenDesktop = isDesktop && desktopMode === "fullscreen";
  const isFloatingDesktop = isDesktop && desktopMode === "floating";

  const showList =
    isFullscreenDesktop ||
    (!isDesktop && data.activeScreen === "list") ||
    (isFloatingDesktop && data.activeScreen === "list");

  const showChat =
    isFullscreenDesktop ||
    (!isDesktop && data.activeScreen === "chat") ||
    (isFloatingDesktop && data.activeScreen === "chat");

  const showInfo = isFullscreenDesktop;

  return (
    <FloatingChatShell
      isOpen={isOpen}
      onClose={onClose || (() => { })}
      desktopMode={desktopMode}
      rightWidth={rightWidth}
      onExpandRight={() => setRightWidth(INFO_DEFAULT)}
    >
      {showList && (
        <div
          className={
            "flex flex-col h-full w-full overflow-hidden bg-white dark:bg-[#161b22]" +
            (isFullscreenDesktop ? " md:border-r md:border-gray-100 md:dark:border-white/5" : "")
          }
        >
          <ChatListPanel
            visibleUnits={data.visibleUnits}
            archivedList={data.archivedList}
            messagesMap={data.messagesMap}
            lastReadMap={data.lastReadMap}
            pinnedUnits={data.pinnedUnits}
            searchQuery={data.searchQuery}
            setSearchQuery={data.setSearchQuery}
            activeUnit={data.activeUnit}
            onOpenUnit={(u) => data.openUnit(u.unit_code)}
            onOpenActionSheet={setActionSheetUnit}
            onClose={onClose}
            layout={isFullscreenDesktop ? "columns" : "stacked"}
            showHeaderClose={!isFullscreenDesktop}
            desktopMode={isDesktop ? desktopMode : undefined}
            onToggleDesktopMode={
              isDesktop
                ? () => setDesktopMode((m) => (m === "fullscreen" ? "floating" : "fullscreen"))
                : undefined
            }
          />
        </div>
      )}

      {showChat && (
        <div className="flex flex-col h-full w-full overflow-hidden relative">
          <ChatRoomPanel
            activeUnit={data.activeUnit}
            activeUnitData={activeUnitData}
            messages={activeMessages}
            currentUserId={currentUserId}
            layout={isFullscreenDesktop ? "columns" : "stacked"}
            onBack={data.backToList}
            onClose={!isFullscreenDesktop ? onClose : undefined}
            onSend={data.sendMessage}
            onEdit={data.editMessage}
            onDelete={data.deleteMessage}
          />
        </div>
      )}

      {showInfo && (
        <div className="h-full w-full overflow-hidden relative border-l border-gray-100 dark:border-white/5">
          {!collapsed && (
            <ResizeHandle
              width={rightWidth}
              onResize={setRightWidth}
              min={INFO_MIN}
              max={INFO_MAX}
            />
          )}
          <div style={{ display: collapsed ? "none" : "block" }} className="h-full">
            <UnitInfoPanel
              unit={activeUnitData}
              messages={activeMessages}
              onCollapse={() => setRightWidth(0)}
            />
          </div>
        </div>
      )}

      {actionSheetUnit && (
        <ChatActionSheet
          unit={actionSheetUnit}
          isArchived={data.archivedUnits.has(actionSheetUnit.unit_code)}
          isPinned={data.pinnedUnits.has(actionSheetUnit.unit_code)}
          onClose={() => setActionSheetUnit(null)}
          onPin={data.pinUnit}
          onUnpin={data.unpinUnit}
          onArchive={data.archiveUnit}
          onUnarchive={data.unarchiveUnit}
        />
      )}
    </FloatingChatShell>
  );
}