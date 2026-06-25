import XCTest

final class ScreenshotTests: XCTestCase {
    let app = XCUIApplication()

    override func setUpWithError() throws {
        continueAfterFailure = false
        app.launchArguments = ["-ms_onboardingComplete", "1"]
        app.launch()
        // Wait for app to settle
        sleep(3)
    }

    func testCaptureAllTabs() throws {
        let tabBar = app.tabBars.firstMatch
        XCTAssertTrue(tabBar.waitForExistence(timeout: 10))

        // Today tab — already visible
        sleep(5)
        let todayScreenshot = XCTAttachment(screenshot: app.screenshot())
        todayScreenshot.name = "01_Today"
        todayScreenshot.lifetime = .keepAlways
        add(todayScreenshot)

        // Forecast tab
        tabBar.buttons["Forecast"].tap()
        sleep(4)
        let forecastScreenshot = XCTAttachment(screenshot: app.screenshot())
        forecastScreenshot.name = "02_Forecast"
        forecastScreenshot.lifetime = .keepAlways
        add(forecastScreenshot)

        // Bushes tab
        tabBar.buttons["Bushes"].tap()
        sleep(2)
        let bushesScreenshot = XCTAttachment(screenshot: app.screenshot())
        bushesScreenshot.name = "03_Bushes"
        bushesScreenshot.lifetime = .keepAlways
        add(bushesScreenshot)

        // Alerts tab
        tabBar.buttons["Alerts"].tap()
        sleep(2)
        let alertsScreenshot = XCTAttachment(screenshot: app.screenshot())
        alertsScreenshot.name = "04_Alerts"
        alertsScreenshot.lifetime = .keepAlways
        add(alertsScreenshot)

        // Settings tab
        tabBar.buttons["Settings"].tap()
        sleep(2)
        let settingsScreenshot = XCTAttachment(screenshot: app.screenshot())
        settingsScreenshot.name = "05_Settings"
        settingsScreenshot.lifetime = .keepAlways
        add(settingsScreenshot)
    }
}
