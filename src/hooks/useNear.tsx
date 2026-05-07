"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  NearConnector as NearConnectorClass,
  NearWalletBase,
} from "@hot-labs/near-connect";
import type { JsonRpcProvider } from "@near-js/providers";
import { nearConfig } from "@/config/near";

type NearWallet = NearWalletBase;
type NearConnector = NearConnectorClass;

interface ConnectorSignInPayload {
  wallet: NearWallet;
  accounts?: Array<{ accountId: string; publicKey?: string }>;
}

interface ViewFunctionParams {
  contractId: string;
  method: string;
  args?: Record<string, any>;
}

interface CallFunctionParams {
  contractId: string;
  method: string;
  args?: Record<string, any>;
  gas?: string;
  deposit?: string;
}

interface NearState {
  wallet: NearWallet | undefined;
  signedAccountId: string;
  loading: boolean;
  connector: NearConnector | null;
  provider: JsonRpcProvider | null;
}

const sharedState: NearState = {
  wallet: undefined,
  signedAccountId: "",
  loading: true,
  connector: null,
  provider: null,
};

type StateListener = (state: NearState) => void;
const listeners = new Set<StateListener>();

let initPromise: Promise<void> | null = null;
let connectorInstance: NearConnector | null = null;

const notifyListeners = (snapshot: NearState) => {
  listeners.forEach((listener) => listener(snapshot));
};

const updateState = (updates: Partial<NearState>) => {
  Object.assign(sharedState, updates);
  notifyListeners({ ...sharedState });
};

const syncWalletState = (
  wallet: NearWallet | undefined,
  signedAccountId: string
) => {
  if (
    sharedState.wallet === wallet &&
    sharedState.signedAccountId === signedAccountId
  ) {
    return;
  }
  updateState({ wallet, signedAccountId });
};

const trackWalletConnectSuccess = (accountId: string) => {
  if (typeof window !== "undefined" && window.plausible) {
    window.plausible("wallet_connect_succeeded", {
      props: { account_id: accountId },
    });
  }
};

const handleConnectorSignOut = () => {
  syncWalletState(undefined, "");
};

const handleConnectorSignIn = async (payload: ConnectorSignInPayload) => {
  try {
    let accounts = payload.accounts;
    if (!accounts) {
      accounts = await payload.wallet.getAccounts();
    }
    const accountId = accounts?.[0]?.accountId ?? "";
    syncWalletState(payload.wallet, accountId);
    if (accountId) {
      trackWalletConnectSuccess(accountId);
    }
  } catch (err) {
    console.error("Failed to fetch wallet accounts:", err);
    syncWalletState(payload.wallet, "");
  }
};

const detachConnectorListeners = () => {
  if (!connectorInstance) return;
  connectorInstance.off("wallet:signOut", handleConnectorSignOut);
  connectorInstance.off("wallet:signIn", handleConnectorSignIn);
};

const attachConnectorListeners = (conn: NearConnector) => {
  conn.on("wallet:signOut", handleConnectorSignOut);
  conn.on("wallet:signIn", handleConnectorSignIn);
};

async function ensureInitialized() {
  if (typeof window === "undefined") {
    return;
  }

  if (!initPromise) {
    let success = false;

    const init = (async () => {
      try {
        const [{ NearConnector }, { JsonRpcProvider }] = await Promise.all([
          import("@hot-labs/near-connect"),
          import("@near-js/providers"),
        ]);

        const nearConnector = new NearConnector({
          network: nearConfig.networkId,
          walletConnect: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
            ? {
                projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
                metadata: {
                  name: "NEAR Proposal Screener",
                  description:
                    "AI-powered screening of NEAR governance proposals",
                  url:
                    typeof window !== "undefined"
                      ? window.location.origin
                      : "https://gov.near.org",
                  icons:
                    typeof window !== "undefined"
                      ? [`${window.location.origin}/near-logo.svg`]
                      : [],
                },
              }
            : undefined,
        });
        const rpcProvider = new JsonRpcProvider({ url: nearConfig.rpcUrl });

        detachConnectorListeners();
        connectorInstance = nearConnector;
        attachConnectorListeners(nearConnector);

        updateState({ connector: nearConnector, provider: rpcProvider });

        try {
          const { wallet, accounts } = await nearConnector.getConnectedWallet();
          if (wallet && accounts?.length) {
            syncWalletState(wallet, accounts[0].accountId);
          }
        } catch (error) {
          if (process.env.NODE_ENV !== "production") {
            console.debug("NEAR wallet rehydrate skipped:", error);
          }
        }

        success = true;
      } catch (error) {
        console.error("Failed to initialize NEAR:", error);
        detachConnectorListeners();
        connectorInstance = null;
        updateState({
          connector: null,
          provider: null,
          wallet: undefined,
          signedAccountId: "",
        });
        throw error;
      } finally {
        updateState({ loading: false });
        if (!success) initPromise = null;
      }
    })();

    initPromise = init;
  }

  return initPromise;
}

async function sharedSignIn() {
  await ensureInitialized();
  const connector = sharedState.connector;
  if (!connector) {
    throw new Error("Connector not initialized (not in browser)");
  }

  try {
    await connector.connect();

    try {
      const { wallet, accounts } = await connector.getConnectedWallet();
      if (wallet && accounts?.length > 0) {
        syncWalletState(wallet, accounts[0].accountId);
      }
    } catch (syncError: unknown) {
      const message =
        syncError instanceof Error ? syncError.message : String(syncError);
      if (message.includes("No wallet selected")) return;
      console.error("Failed to sync wallet state:", syncError);
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    if (message.toLowerCase().includes("user rejected")) {
      console.info("Wallet connection cancelled by user.");
      return;
    }
    console.error("Sign in error:", error);
    throw error instanceof Error ? error : new Error(message);
  }
}

async function sharedSignOut() {
  await ensureInitialized();
  const connector = sharedState.connector;
  const wallet = sharedState.wallet;
  if (!connector || !wallet) {
    throw new Error("Wallet not connected");
  }

  try {
    await connector.disconnect(wallet);
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  } finally {
    syncWalletState(undefined, "");
  }
}

async function sharedViewFunction({
  contractId,
  method,
  args = {},
}: ViewFunctionParams) {
  await ensureInitialized();
  const provider = sharedState.provider;
  if (!provider) {
    throw new Error("Provider not initialized");
  }
  return provider.callFunction(contractId, method, args);
}

async function sharedCallFunction({
  contractId,
  method,
  args = {},
  gas = "30000000000000",
  deposit = "0",
}: CallFunctionParams) {
  await ensureInitialized();
  const wallet = sharedState.wallet;
  if (!wallet) {
    throw new Error("Wallet not connected");
  }

  return wallet.signAndSendTransaction({
    receiverId: contractId,
    actions: [
      {
        type: "FunctionCall",
        params: { methodName: method, args, gas, deposit },
      },
    ],
  });
}

export function useNear() {
  const [state, setState] = useState<NearState>(sharedState);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStateChange = (nextState: NearState) => setState(nextState);

    listeners.add(handleStateChange);
    setState(sharedState);
    ensureInitialized();

    return () => {
      listeners.delete(handleStateChange);
    };
  }, []);

  const signIn = useCallback(async () => {
    await sharedSignIn();
  }, []);

  const signOut = useCallback(async () => {
    await sharedSignOut();
  }, []);

  const viewFunction = useCallback(
    async (params: ViewFunctionParams) => sharedViewFunction(params),
    []
  );

  const callFunction = useCallback(
    async (params: CallFunctionParams) => sharedCallFunction(params),
    []
  );

  return {
    signedAccountId: state.signedAccountId,
    wallet: state.wallet,
    signIn,
    signOut,
    loading: state.loading,
    viewFunction,
    callFunction,
    provider: state.provider,
    connector: state.connector,
  };
}
