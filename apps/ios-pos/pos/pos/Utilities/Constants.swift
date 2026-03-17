import Foundation

struct Constants {
    struct API {
        // FIXME: Update with actual production URL when deploying
        nonisolated(unsafe) static let baseURL = URL(string: "http://localhost:3001/api/v1")!
    }
}
