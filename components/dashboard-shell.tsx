"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { AlertDashboard, demoAlerts, type Alert } from "@/components/alert-dashboard";
import { MonitorDashboard } from "@/components/monitor-dashboard";
import type { DashboardData } from "@/lib/monitor-types";
import { isAlarmSoundEnabled, playAlarmSound } from "@/lib/alarm-audio";

type Snapshot = { dashboard: DashboardData; alerts: { items: Alert[] }; updatedAt: string };

export function DashboardShell({ data }: { data: DashboardData }) {
  const [screen, setScreen] = useState<"flow" | "alerts">("flow");
  const [live, setLive] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState("正在连接服务…");
  const [loginRequired, setLoginRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState(0);
  const previousEvents = useRef<Set<string> | null>(null);

  useEffect(() => {
    setScreen(new URLSearchParams(window.location.search).get("screen") === "alerts" ? "alerts" : "flow");
  }, []);

  useEffect(() => {
    if (window.location.hostname.endsWith("github.io")) {
      setStatus("静态演示 · 实时模拟请启动本地 Python 服务");
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let request: AbortController | null = null;
    async function refresh() {
      request = new AbortController();
      const timeout = setTimeout(() => request?.abort(), 8000);
      try {
        const response = await fetch("/api/snapshot", { cache: "no-store", signal: request.signal });
        if (cancelled) return;
        if (response.status === 401) {
          setLoginRequired(true);
          setStatus("需要登录 · 数据尚未连接");
          return;
        }
        if (!response.ok) throw new Error("接口不可用");
        const snapshot = await response.json() as Snapshot;
        if (!snapshot.dashboard?.groups || !Array.isArray(snapshot.alerts?.items) || !snapshot.updatedAt) throw new Error("数据格式错误");
        if (cancelled) return;
        const events = new Set(snapshot.alerts.items.filter((alert) => alert.status !== "已恢复").map((alert) => alert.id));
        const newEvent = previousEvents.current !== null && [...events].some((id) => !previousEvents.current!.has(id));
        previousEvents.current = events;
        setLive(snapshot);
        setLoginRequired(false);
        setStatus(`实时模拟 · 每 3 秒刷新 · 最后更新 ${snapshot.updatedAt}`);
        if (newEvent && isAlarmSoundEnabled()) {
          void playAlarmSound().catch(() => setStatus("实时模拟 · 请关闭后重新开启告警声音以允许播放"));
        }
      } catch {
        if (!cancelled) setStatus("连接中断 · 保留上次数据（尚无实时数据时显示演示） · 正在重试");
      } finally {
        clearTimeout(timeout);
        if (!cancelled) timer = setTimeout(refresh, 3000);
      }
    }
    void refresh();
    return () => { cancelled = true; clearTimeout(timer); request?.abort(); };
  }, [session]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setLoginError("");
    try {
      const response = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }), signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(response.status === 401 ? "密码错误" : "登录失败");
      setPassword("");
      setLoginRequired(false);
      setSession((value) => value + 1);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "无法连接服务");
    } finally { setBusy(false); }
  }

  return <>
    <div className="connection-banner" role="status">{status}</div>
    {screen === "alerts" ? <AlertDashboard alerts={live?.alerts.items ?? demoAlerts} updatedAt={live?.updatedAt} /> : <MonitorDashboard data={live?.dashboard ?? data} />}
    {loginRequired && <div className="monitor-login-overlay"><form className="monitor-login-card" onSubmit={login}>
      <h2>登录实时监控</h2><p>本地模拟服务默认密码：demo123</p>
      <label htmlFor="monitor-password">访问密码</label>
      <input id="monitor-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
      <p role="alert">{loginError}</p><button disabled={busy}>{busy ? "正在登录…" : "登录"}</button>
    </form></div>}
  </>;
}
