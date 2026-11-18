"use client";

import { Brand } from "@/components/brand/brand";
import { AuthScreen } from "@/features/auth/components/auth-screen";
import { useSession } from "@/features/auth/use-session";
import { TaskBoard } from "@/features/tasks/components/task-board";

export function WorkspaceApp() {
  const { session, notice, startSession, endSession } = useSession();

  if (session === undefined) {
    return (
      <main className="launch" aria-busy="true">
        <Brand />
        <p role="status">Opening your workspace?</p>
      </main>
    );
  }
  if (session)
    return (
      <TaskBoard
        key={session.id}
        request={session.request}
        onSignOut={endSession}
      />
    );
  return <AuthScreen notice={notice} onLogin={startSession} />;
}
