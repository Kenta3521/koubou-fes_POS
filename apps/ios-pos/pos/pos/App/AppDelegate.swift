import UIKit
import StripeTerminal

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        Terminal.initWithTokenProvider(
            TapToPayService.shared,
            delegate: TapToPayService.shared
        )
        return true
    }
}
