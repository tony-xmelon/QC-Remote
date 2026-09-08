//! Typed parsing/building for device-originated HTTP-forward envelopes.
//!
//! This module deliberately performs no networking. URLs and headers originate
//! on the connected device and are untrusted input; a host must apply an
//! explicit allowlist, redirect policy, size limits, and credential policy
//! before choosing to execute any request.

use crate::{
    commands::OutboundMessage, compression::maybe_gunzip, profile, proto::cortex_protobuf_v2 as pa,
    responses::ResponseDecodeError,
};
use prost::Message;
use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct UntrustedUrl(pub String);

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct ForwardHeader {
    pub name: String,
    pub value: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum HttpOperation {
    Get,
    Put,
    Post,
    Delete,
    Unknown(i32),
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductForwardRequest {
    pub action: i32,
    pub request_id: Option<u64>,
    pub cloud_request_id: u64,
    pub operation: HttpOperation,
    pub url: UntrustedUrl,
    pub timeout: i32,
    pub multipart: bool,
    pub headers: Vec<ForwardHeader>,
    pub payload: Option<Vec<u8>>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChunkForwardRequest {
    pub action: i32,
    pub request_id: Option<u64>,
    pub service_request_id: u64,
    pub request_type: i32,
    pub url: Option<UntrustedUrl>,
    pub timeout: Option<i32>,
    pub headers: Vec<ForwardHeader>,
    pub payload: Vec<u8>,
    pub is_last_chunk: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdaterForwardRequest {
    pub action: i32,
    pub request_id: Option<u64>,
    pub updater_request_id: u64,
    pub request_type: i32,
    pub url: UntrustedUrl,
    pub timeout: i32,
    pub headers: Vec<ForwardHeader>,
    pub payload: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ForwardResponse {
    pub action: i32,
    pub request_id: Option<u64>,
    pub service_request_id: u64,
    pub payload: Vec<u8>,
    pub error_code: Option<i32>,
    pub is_last_chunk: Option<bool>,
}

fn decode<M: Message + Default>(payload: &[u8]) -> Result<M, ResponseDecodeError> {
    if payload.len() > profile::MAX_FRAME_BYTES {
        return Err(ResponseDecodeError::OversizedReply);
    }
    Ok(M::decode(maybe_gunzip(payload)?.as_slice())?)
}
fn headers(values: Vec<pa::ProductForwardHeaderPair>) -> Vec<ForwardHeader> {
    values
        .into_iter()
        .map(|v| ForwardHeader {
            name: v.name,
            value: v.value,
        })
        .collect()
}
fn http_operation(value: i32) -> HttpOperation {
    match pa::http_operation::Enum::try_from(value) {
        Ok(pa::http_operation::Enum::Get) => HttpOperation::Get,
        Ok(pa::http_operation::Enum::Put) => HttpOperation::Put,
        Ok(pa::http_operation::Enum::Post) => HttpOperation::Post,
        Ok(pa::http_operation::Enum::Delete) => HttpOperation::Delete,
        Err(_) => HttpOperation::Unknown(value),
    }
}

pub fn decode_product_forward_request(
    payload: &[u8],
) -> Result<ProductForwardRequest, ResponseDecodeError> {
    let m: pa::ProductForwardMessage = decode(payload)?;
    let r = m
        .request
        .map(|pa::product_forward_message::Request::Request(v)| v)
        .ok_or(ResponseDecodeError::Incomplete("product-forward request"))?;
    Ok(ProductForwardRequest {
        action: m.action,
        request_id: m
            .request_id
            .map(|pa::product_forward_message::RequestId::RequestId(v)| v),
        cloud_request_id: m.cloud_request_id,
        operation: http_operation(r.operation),
        url: UntrustedUrl(r.url),
        timeout: r.timeout,
        multipart: r.is_multipart,
        headers: headers(r.headers),
        payload: r
            .payload
            .map(|pa::product_forward_request::Payload::Payload(v)| v),
    })
}

pub fn decode_backups_forward_request(
    payload: &[u8],
) -> Result<ChunkForwardRequest, ResponseDecodeError> {
    let m: pa::BackupsForwardMessage = decode(payload)?;
    let r = m
        .request
        .map(|pa::backups_forward_message::Request::Request(v)| v)
        .ok_or(ResponseDecodeError::Incomplete("backups-forward request"))?;
    Ok(ChunkForwardRequest {
        action: m.action,
        request_id: m
            .request_id
            .map(|pa::backups_forward_message::RequestId::RequestId(v)| v),
        service_request_id: m.backups_request_id,
        request_type: r.r#type,
        url: r
            .url
            .map(|pa::backups_forward_request::Url::Url(v)| UntrustedUrl(v)),
        timeout: r
            .timeout
            .map(|pa::backups_forward_request::Timeout::Timeout(v)| v),
        headers: headers(r.headers),
        payload: r.payload,
        is_last_chunk: r
            .is_last_chunk
            .map(|pa::backups_forward_request::IsLastChunk::IsLastChunk(v)| v),
    })
}

pub fn decode_logs_forward_request(
    payload: &[u8],
) -> Result<ChunkForwardRequest, ResponseDecodeError> {
    let m: pa::LogsForwardMessage = decode(payload)?;
    let r = m
        .request
        .map(|pa::logs_forward_message::Request::Request(v)| v)
        .ok_or(ResponseDecodeError::Incomplete("logs-forward request"))?;
    Ok(ChunkForwardRequest {
        action: m.action,
        request_id: m
            .request_id
            .map(|pa::logs_forward_message::RequestId::RequestId(v)| v),
        service_request_id: m.logs_request_id,
        request_type: r.r#type,
        url: r
            .url
            .map(|pa::logs_forward_request::Url::Url(v)| UntrustedUrl(v)),
        timeout: r
            .timeout
            .map(|pa::logs_forward_request::Timeout::Timeout(v)| v),
        headers: headers(r.headers),
        payload: r.payload,
        is_last_chunk: r
            .is_last_chunk
            .map(|pa::logs_forward_request::IsLastChunk::IsLastChunk(v)| v),
    })
}

pub fn decode_updater_forward_request(
    payload: &[u8],
) -> Result<UpdaterForwardRequest, ResponseDecodeError> {
    let m: pa::UpdaterForwardMessage = decode(payload)?;
    let r = m
        .request
        .map(|pa::updater_forward_message::Request::Request(v)| v)
        .ok_or(ResponseDecodeError::Incomplete("updater-forward request"))?;
    Ok(UpdaterForwardRequest {
        action: m.action,
        request_id: m
            .request_id
            .map(|pa::updater_forward_message::RequestId::RequestId(v)| v),
        updater_request_id: m.updater_request_id,
        request_type: r.r#type,
        url: UntrustedUrl(r.url),
        timeout: r.timeout,
        headers: headers(r.headers),
        payload: r
            .payload
            .map(|pa::updater_forward_request::Payload::Payload(v)| v),
    })
}

pub fn decode_product_forward_response(
    payload: &[u8],
) -> Result<ForwardResponse, ResponseDecodeError> {
    let m: pa::ProductForwardMessage = decode(payload)?;
    let r = m
        .response
        .map(|pa::product_forward_message::Response::Response(v)| v)
        .ok_or(ResponseDecodeError::Incomplete("product-forward response"))?;
    Ok(ForwardResponse {
        action: m.action,
        request_id: m
            .request_id
            .map(|pa::product_forward_message::RequestId::RequestId(v)| v),
        service_request_id: m.cloud_request_id,
        payload: r.payload,
        error_code: Some(r.error_code),
        is_last_chunk: None,
    })
}

pub fn decode_backups_forward_response(
    payload: &[u8],
) -> Result<ForwardResponse, ResponseDecodeError> {
    let m: pa::BackupsForwardMessage = decode(payload)?;
    let r = m
        .response
        .map(|pa::backups_forward_message::Response::Response(v)| v)
        .ok_or(ResponseDecodeError::Incomplete("backups-forward response"))?;
    Ok(ForwardResponse {
        action: m.action,
        request_id: m
            .request_id
            .map(|pa::backups_forward_message::RequestId::RequestId(v)| v),
        service_request_id: m.backups_request_id,
        payload: r.payload,
        error_code: r
            .error_code
            .map(|pa::backups_forward_response::ErrorCode::ErrorCode(v)| v),
        is_last_chunk: r
            .is_last_chunk
            .map(|pa::backups_forward_response::IsLastChunk::IsLastChunk(v)| v),
    })
}

pub fn decode_logs_forward_response(
    payload: &[u8],
) -> Result<ForwardResponse, ResponseDecodeError> {
    let m: pa::LogsForwardMessage = decode(payload)?;
    let r = m
        .response
        .map(|pa::logs_forward_message::Response::Response(v)| v)
        .ok_or(ResponseDecodeError::Incomplete("logs-forward response"))?;
    Ok(ForwardResponse {
        action: m.action,
        request_id: m
            .request_id
            .map(|pa::logs_forward_message::RequestId::RequestId(v)| v),
        service_request_id: m.logs_request_id,
        payload: r.payload,
        error_code: Some(r.error_code),
        is_last_chunk: None,
    })
}

pub fn decode_updater_forward_response(
    payload: &[u8],
) -> Result<ForwardResponse, ResponseDecodeError> {
    let m: pa::UpdaterForwardMessage = decode(payload)?;
    let r = m
        .response
        .map(|pa::updater_forward_message::Response::Response(v)| v)
        .ok_or(ResponseDecodeError::Incomplete("updater-forward response"))?;
    Ok(ForwardResponse {
        action: m.action,
        request_id: m
            .request_id
            .map(|pa::updater_forward_message::RequestId::RequestId(v)| v),
        service_request_id: m.updater_request_id,
        payload: r.payload,
        error_code: r
            .error_code
            .map(|pa::updater_forward_response::ErrorCode::ErrorCode(v)| v),
        is_last_chunk: r
            .is_last_chunk
            .map(|pa::updater_forward_response::IsLastChunk::IsLastChunk(v)| v),
    })
}

fn outbound<M: Message>(message_type: u16, message: M) -> OutboundMessage {
    OutboundMessage {
        message_type,
        payload: message.encode_to_vec(),
    }
}
pub fn product_forward_response(
    request_id: Option<u64>,
    cloud_request_id: u64,
    payload: Vec<u8>,
    error_code: i32,
) -> OutboundMessage {
    outbound(
        profile::MESSAGE_TYPE_PRODUCT_FORWARD,
        pa::ProductForwardMessage {
            action: pa::message_action::Enum::Update as i32,
            request_id: request_id.map(pa::product_forward_message::RequestId::RequestId),
            cloud_request_id,
            response: Some(pa::product_forward_message::Response::Response(
                pa::ProductForwardResponse {
                    payload,
                    error_code,
                },
            )),
            ..Default::default()
        },
    )
}
pub fn backups_forward_response(
    request_id: Option<u64>,
    service_request_id: u64,
    payload: Vec<u8>,
    is_last_chunk: Option<bool>,
    error_code: Option<i32>,
) -> OutboundMessage {
    outbound(
        profile::MESSAGE_TYPE_BACKUPS_FORWARD,
        pa::BackupsForwardMessage {
            action: pa::message_action::Enum::Update as i32,
            request_id: request_id.map(pa::backups_forward_message::RequestId::RequestId),
            backups_request_id: service_request_id,
            response: Some(pa::backups_forward_message::Response::Response(
                pa::BackupsForwardResponse {
                    payload,
                    is_last_chunk: is_last_chunk
                        .map(pa::backups_forward_response::IsLastChunk::IsLastChunk),
                    error_code: error_code.map(pa::backups_forward_response::ErrorCode::ErrorCode),
                },
            )),
            ..Default::default()
        },
    )
}
pub fn logs_forward_response(
    request_id: Option<u64>,
    service_request_id: u64,
    payload: Vec<u8>,
    error_code: i32,
) -> OutboundMessage {
    outbound(
        profile::MESSAGE_TYPE_LOGS_FORWARD,
        pa::LogsForwardMessage {
            action: pa::message_action::Enum::Update as i32,
            request_id: request_id.map(pa::logs_forward_message::RequestId::RequestId),
            logs_request_id: service_request_id,
            response: Some(pa::logs_forward_message::Response::Response(
                pa::LogsForwardResponse {
                    payload,
                    error_code,
                },
            )),
            ..Default::default()
        },
    )
}
pub fn updater_forward_response(
    request_id: Option<u64>,
    updater_request_id: u64,
    payload: Vec<u8>,
    is_last_chunk: Option<bool>,
    error_code: Option<i32>,
) -> OutboundMessage {
    outbound(
        profile::MESSAGE_TYPE_UPDATER_FORWARD,
        pa::UpdaterForwardMessage {
            action: pa::message_action::Enum::Update as i32,
            request_id: request_id.map(pa::updater_forward_message::RequestId::RequestId),
            updater_request_id,
            response: Some(pa::updater_forward_message::Response::Response(
                pa::UpdaterForwardResponse {
                    payload,
                    is_last_chunk: is_last_chunk
                        .map(pa::updater_forward_response::IsLastChunk::IsLastChunk),
                    error_code: error_code.map(pa::updater_forward_response::ErrorCode::ErrorCode),
                },
            )),
            ..Default::default()
        },
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn product_request_is_typed_but_url_remains_untrusted() {
        let wire = pa::ProductForwardMessage {
            action: pa::message_action::Enum::Create as i32,
            cloud_request_id: 9,
            request: Some(pa::product_forward_message::Request::Request(
                pa::ProductForwardRequest {
                    operation: pa::http_operation::Enum::Post as i32,
                    url: "https://device.invalid/path".into(),
                    timeout: 30,
                    is_multipart: true,
                    headers: vec![pa::ProductForwardHeaderPair {
                        name: "x-test".into(),
                        value: "yes".into(),
                    }],
                    payload: Some(pa::product_forward_request::Payload::Payload(vec![1, 2, 3])),
                },
            )),
            ..Default::default()
        }
        .encode_to_vec();
        let decoded = decode_product_forward_request(&wire).unwrap();
        assert_eq!(decoded.operation, HttpOperation::Post);
        assert_eq!(
            decoded.url,
            UntrustedUrl("https://device.invalid/path".into())
        );
        assert_eq!(decoded.payload, Some(vec![1, 2, 3]));
    }

    #[test]
    fn chunk_requests_and_all_response_envelopes_round_trip() {
        let wire = pa::BackupsForwardMessage {
            backups_request_id: 12,
            request: Some(pa::backups_forward_message::Request::Request(
                pa::BackupsForwardRequest {
                    r#type: pa::backups_forward_request_type::Enum::Download as i32,
                    payload: vec![7],
                    is_last_chunk: Some(pa::backups_forward_request::IsLastChunk::IsLastChunk(
                        false,
                    )),
                    ..Default::default()
                },
            )),
            ..Default::default()
        }
        .encode_to_vec();
        let decoded = decode_backups_forward_request(&wire).unwrap();
        assert_eq!(decoded.service_request_id, 12);
        assert_eq!(decoded.is_last_chunk, Some(false));

        let logs = pa::LogsForwardMessage {
            logs_request_id: 13,
            request: Some(pa::logs_forward_message::Request::Request(
                pa::LogsForwardRequest {
                    r#type: pa::logs_forward_request_type::Enum::UploadLogs as i32,
                    url: Some(pa::logs_forward_request::Url::Url(
                        "https://logs.invalid".into(),
                    )),
                    ..Default::default()
                },
            )),
            ..Default::default()
        }
        .encode_to_vec();
        assert_eq!(
            decode_logs_forward_request(&logs)
                .unwrap()
                .service_request_id,
            13
        );
        let updater = pa::UpdaterForwardMessage {
            updater_request_id: 14,
            request: Some(pa::updater_forward_message::Request::Request(
                pa::UpdaterForwardRequest {
                    r#type: pa::updater_forward_request_type::Enum::DownloadUpdate as i32,
                    url: "https://updates.invalid".into(),
                    ..Default::default()
                },
            )),
            ..Default::default()
        }
        .encode_to_vec();
        assert_eq!(
            decode_updater_forward_request(&updater)
                .unwrap()
                .updater_request_id,
            14
        );

        let product = product_forward_response(Some(1), 2, vec![1], 0);
        assert_eq!(product.message_type, 29);
        assert_eq!(
            decode_product_forward_response(&product.payload)
                .unwrap()
                .payload,
            vec![1]
        );
        let backups = backups_forward_response(Some(1), 2, vec![2], Some(true), None);
        assert_eq!(backups.message_type, 30);
        assert_eq!(
            decode_backups_forward_response(&backups.payload)
                .unwrap()
                .is_last_chunk,
            Some(true)
        );
        let logs = logs_forward_response(Some(1), 2, vec![3], 0);
        assert_eq!(logs.message_type, 31);
        assert_eq!(
            decode_logs_forward_response(&logs.payload).unwrap().payload,
            vec![3]
        );
        let updater = updater_forward_response(Some(1), 2, vec![4], Some(true), None);
        assert_eq!(updater.message_type, 61);
        assert_eq!(
            decode_updater_forward_response(&updater.payload)
                .unwrap()
                .payload,
            vec![4]
        );
    }
}
