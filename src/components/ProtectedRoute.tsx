import { Navigate } from "@solidjs/router";
import { authState } from "../stores/auth";
import { JSX } from "solid-js";

export default function ProtectedRoute(props: { children: JSX.Element }) {
  return <>{authState.isAuthenticated ? props.children : <Navigate href="/" />}</>;
}
