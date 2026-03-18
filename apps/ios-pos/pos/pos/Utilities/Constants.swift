import Foundation

struct Constants {
    struct API {
        // FIXME: Update with actual production URL when deploying
        static let baseURL = URL(string: "http://192.168.11.2:3001/api/v1")!
    }

    struct UserDefaultsKeys {
        static let selectedOrganizationId = "selectedOrganizationId"
        static let biometricLockEnabled = "biometricLockEnabled"
        static let appearanceMode = "appearanceMode"
        static let ttpOnboardingCompleted = "ttpOnboardingCompleted"
        static let ttpSplashDismissed = "ttpSplashDismissed"
    }

    struct Stripe {
        static let locationId = "tml_GbZXbwEQdN4n3p"
    }
}
