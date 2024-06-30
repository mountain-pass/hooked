import "@/styles/globals.css";
import ReactQueryProvider from "@/providers/ReactQueryProvider";
import type { AppProps } from "next/app";
import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <ReactQueryProvider >
        <Component {...pageProps} />
      </ReactQueryProvider>
    </>
  )
}
