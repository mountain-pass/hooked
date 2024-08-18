import { ExecuteScriptModal } from "@/components/modals/ExecuteScriptModal";
import ReactQueryProvider from "@/providers/ReactQueryProvider";
import "@/styles/globals.css";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <ReactQueryProvider >
        <ExecuteScriptModal />
        <Component {...pageProps} />
        <ReactQueryDevtools />
      </ReactQueryProvider>
    </>
  )
}
