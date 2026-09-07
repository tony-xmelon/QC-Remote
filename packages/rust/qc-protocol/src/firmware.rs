//! Firmware profile selection and operation-support introspection.
//!
//! This mirrors pyquadcortex's ADR-0020 seam without coupling the Rust
//! protocol crate to a particular app command list. Callers provide their
//! operation inventory when asking which entries remain unverified.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Support {
    Verified,
    Experimental,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Evidence {
    Maintainer,
    Contributed,
    Stub,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VerifiedOperations {
    All,
    Listed(&'static [&'static str]),
}

impl VerifiedOperations {
    pub fn contains(self, operation: &str) -> bool {
        match self {
            Self::All => true,
            Self::Listed(operations) => operations.contains(&operation),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DeviceProfile {
    pub name: &'static str,
    pub device_type: i32,
    pub coros_versions: &'static [&'static str],
    pub evidence: Evidence,
    pub verified_operations: VerifiedOperations,
}

pub const QUAD_CORTEX_4_0_1: DeviceProfile = DeviceProfile {
    name: "QuadCortex",
    device_type: 0,
    coros_versions: &["4.0.1"],
    evidence: Evidence::Maintainer,
    verified_operations: VerifiedOperations::All,
};

pub const QUAD_CORTEX_4_1: DeviceProfile = DeviceProfile {
    name: "QuadCortex41",
    device_type: 0,
    coros_versions: &["4.1.0"],
    evidence: Evidence::Contributed,
    verified_operations: VerifiedOperations::Listed(&[]),
};

pub const QUAD_CORTEX_MINI: DeviceProfile = DeviceProfile {
    name: "QuadCortexMini",
    device_type: 1,
    coros_versions: &[],
    evidence: Evidence::Stub,
    verified_operations: VerifiedOperations::Listed(&[]),
};

pub const PROFILES: &[DeviceProfile] = &[QUAD_CORTEX_4_0_1, QUAD_CORTEX_4_1, QUAD_CORTEX_MINI];

pub fn resolve(device_type: i32, coros_version: &str) -> Option<&'static DeviceProfile> {
    PROFILES.iter().find(|profile| {
        profile.device_type == device_type && profile.coros_versions.contains(&coros_version)
    })
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ProfileSelection {
    profile: &'static DeviceProfile,
    support: Support,
}

impl ProfileSelection {
    pub const fn new(profile: &'static DeviceProfile, support: Support) -> Self {
        Self { profile, support }
    }

    pub const fn profile(self) -> &'static DeviceProfile {
        self.profile
    }

    pub const fn support(self) -> Support {
        self.support
    }

    pub fn operation_is_verified(self, operation: &str) -> bool {
        self.profile.verified_operations.contains(operation)
    }

    pub fn operation_is_allowed(self, operation: &str) -> bool {
        self.support == Support::Experimental || self.operation_is_verified(operation)
    }

    pub fn unverified_operations<'a>(
        self,
        operations: impl IntoIterator<Item = &'a str>,
    ) -> Vec<&'a str> {
        operations
            .into_iter()
            .filter(|operation| !self.operation_is_verified(operation))
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_the_two_measured_quad_cortex_profiles() {
        assert_eq!(resolve(0, "4.0.1"), Some(&QUAD_CORTEX_4_0_1));
        assert_eq!(resolve(0, "4.1.0"), Some(&QUAD_CORTEX_4_1));
        assert_eq!(resolve(0, "4.2.0"), None);
        assert_eq!(resolve(1, "4.1.0"), None);
    }

    #[test]
    fn verified_policy_refuses_unmeasured_operations() {
        let selection = ProfileSelection::new(&QUAD_CORTEX_4_1, Support::Verified);
        assert_eq!(selection.support(), Support::Verified);
        assert!(!selection.operation_is_allowed("capture_screen"));
        assert_eq!(
            selection.unverified_operations(["capture_screen", "tap_screen"]),
            ["capture_screen", "tap_screen"]
        );
    }

    #[test]
    fn experimental_policy_allows_but_does_not_relabel_unverified_operations() {
        let selection = ProfileSelection::new(&QUAD_CORTEX_4_1, Support::Experimental);
        assert!(selection.operation_is_allowed("capture_screen"));
        assert!(!selection.operation_is_verified("capture_screen"));
    }

    #[test]
    fn maintainer_profile_verifies_the_whole_inventory() {
        let selection = ProfileSelection::new(&QUAD_CORTEX_4_0_1, Support::Verified);
        assert!(selection.operation_is_allowed("future_operation"));
        assert!(selection.unverified_operations(["a", "b"]).is_empty());
    }
}
