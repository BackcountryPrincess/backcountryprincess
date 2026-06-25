import Foundation
import UserNotifications

final class NotificationService {
    static let shared = NotificationService()
    private init() {}

    func requestPermission() async -> Bool {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        if settings.authorizationStatus == .authorized { return true }
        return (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
    }

    func authorizationStatus() async -> UNAuthorizationStatus {
        await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
    }

    /// Schedule local notifications for the next 7 days of forecast.
    /// Returns new AlertRecord entries that were scheduled.
    func scheduleAlerts(
        forecast: [ForecastDay],
        bushName: String,
        enableFreezeThaw: Bool,
        enableExceptional: Bool,
        enableSeasonStart: Bool,
        enableSeasonEnd: Bool,
        hour: Int
    ) async -> [AlertRecord] {
        let center = UNUserNotificationCenter.current()
        var records: [AlertRecord] = []

        let dateFmt = DateFormatter()
        dateFmt.dateFormat = "yyyy-MM-dd"

        // Skip today (index 0) — schedule for tomorrow and beyond
        let upcoming = Array(forecast.dropFirst())

        for day in upcoming {
            guard let dayDate = dateFmt.date(from: day.date) else { continue }
            var comps = Calendar.current.dateComponents([.year, .month, .day], from: dayDate)
            comps.hour = hour
            comps.minute = 0

            if enableFreezeThaw && day.freezeThaw {
                let id = "ms_ft_\(day.date)"
                let content = UNMutableNotificationContent()
                content.title = "Freeze-thaw conditions expected"
                content.body  = "\(bushName) — Maple Score \(day.mapleScore). \(day.scoreLabel) run conditions."
                content.sound = .default
                let req = UNNotificationRequest(
                    identifier: id,
                    content: content,
                    trigger: UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
                )
                try? await center.add(req)
                records.append(AlertRecord(
                    id: id, type: .freezeThaw, bushName: bushName,
                    mapleScore: day.mapleScore, date: day.date, scheduledAt: Date()
                ))
            }

            if enableExceptional && day.mapleScore >= 80 {
                let id = "ms_ex_\(day.date)"
                let content = UNMutableNotificationContent()
                content.title = "Exceptional sap run forecast"
                content.body  = "\(bushName) — Maple Score \(day.mapleScore). Prime conditions expected."
                content.sound = .default
                let req = UNNotificationRequest(
                    identifier: id,
                    content: content,
                    trigger: UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
                )
                try? await center.add(req)
                records.append(AlertRecord(
                    id: id, type: .exceptionalRun, bushName: bushName,
                    mapleScore: day.mapleScore, date: day.date, scheduledAt: Date()
                ))
            }
        }

        // Season start: first freeze-thaw in forecast after off-season
        if enableSeasonStart,
           let firstFT = forecast.first(where: { $0.freezeThaw && $0.seasonProgression > 15 }),
           let ftDate = dateFmt.date(from: firstFT.date) {
            let id = "ms_ss_\(firstFT.date)"
            let content = UNMutableNotificationContent()
            content.title = "Sap season is beginning"
            content.body  = "\(bushName) — freeze-thaw conditions forecast for \(firstFT.displayDate). Prepare your taps."
            content.sound = .default
            var comps = Calendar.current.dateComponents([.year, .month, .day], from: ftDate)
            comps.hour = hour; comps.minute = 0
            let req = UNNotificationRequest(
                identifier: id,
                content: content,
                trigger: UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
            )
            try? await center.add(req)
            records.append(AlertRecord(
                id: id, type: .seasonStart, bushName: bushName,
                mapleScore: firstFT.mapleScore, date: firstFT.date, scheduledAt: Date()
            ))
        }

        // Season end: 3+ consecutive warm days at end of forecast window
        if enableSeasonEnd, let lastDay = forecast.last, lastDay.negativeStreak >= 3 {
            let id = "ms_se_\(lastDay.date)"
            let content = UNMutableNotificationContent()
            content.title = "Sap season may be ending"
            content.body  = "\(bushName) — \(lastDay.negativeStreak) warm days in a row. Consider pulling taps."
            content.sound = .default
            // Fire as soon as possible (immediate local notification)
            let req = UNNotificationRequest(identifier: id, content: content, trigger: nil)
            try? await center.add(req)
            records.append(AlertRecord(
                id: id, type: .seasonEnd, bushName: bushName,
                mapleScore: lastDay.mapleScore, date: lastDay.date, scheduledAt: Date()
            ))
        }

        return records
    }
}
