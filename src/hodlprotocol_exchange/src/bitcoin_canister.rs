// Bitcoin Canister Candid interface
// Auto-generated from ICP Bitcoin Canister
#![allow(dead_code, unused_imports)]
use candid::{self, CandidType, Deserialize, Principal};
use ic_cdk::api::call::CallResult as Result;

#[derive(CandidType, Deserialize)]
pub enum Network {
    #[serde(rename = "mainnet")]
    Mainnet,
    #[serde(rename = "regtest")]
    Regtest,
    #[serde(rename = "testnet")]
    Testnet,
}

pub type Address = String;
pub type Satoshi = u64;
pub type BlockHeight = u32;

#[derive(CandidType, Deserialize)]
pub enum GetUtxosRequestFilterInner {
    #[serde(rename = "page")]
    Page(serde_bytes::ByteBuf),
    #[serde(rename = "min_confirmations")]
    MinConfirmations(u32),
}

#[derive(CandidType, Deserialize)]
pub struct GetUtxosRequest {
    pub network: Network,
    pub filter: Option<GetUtxosRequestFilterInner>,
    pub address: Address,
}

pub type BlockHash = serde_bytes::ByteBuf;

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Outpoint {
    pub txid: serde_bytes::ByteBuf,
    pub vout: u32,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Utxo {
    pub height: BlockHeight,
    pub value: Satoshi,
    pub outpoint: Outpoint,
}

#[derive(CandidType, Deserialize)]
pub struct GetUtxosResponse {
    pub next_page: Option<serde_bytes::ByteBuf>,
    pub tip_height: BlockHeight,
    pub tip_block_hash: BlockHash,
    pub utxos: Vec<Utxo>,
}

pub struct Service(pub Principal);
impl Service {
    pub async fn bitcoin_get_utxos(&self, arg0: GetUtxosRequest) -> Result<(GetUtxosResponse,)> {
        let cycles = match arg0.network {
            Network::Mainnet => 10_000_000_000u128,
            Network::Testnet => 4_000_000_000u128,
            Network::Regtest => 0u128,
        };
        ic_cdk::api::call::call_with_payment128(self.0, "bitcoin_get_utxos", (arg0,), cycles).await
    }
}
