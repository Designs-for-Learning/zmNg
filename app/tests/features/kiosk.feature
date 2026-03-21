Feature: Kiosk Mode

  Background:
    Given I am logged in and on the monitors page

  Scenario: Lock via sidebar shows overlay
    When I click the sidebar kiosk lock button
    And I set a 4-digit PIN "1234"
    And I confirm the PIN "1234"
    Then the kiosk overlay should be visible
    And the sidebar should not be visible

  Scenario: Unlock via PIN removes overlay
    Given kiosk mode is active with PIN "1234"
    When I click the kiosk unlock button
    And I enter the PIN "1234"
    Then the kiosk overlay should not be visible

  Scenario: Incorrect PIN shows error
    Given kiosk mode is active with PIN "1234"
    When I click the kiosk unlock button
    And I enter the PIN "0000"
    Then I should see "Incorrect PIN"

  Scenario: Cannot navigate while locked
    Given kiosk mode is active with PIN "1234"
    When I try to click a navigation link
    Then the kiosk overlay should still be visible
    And the page should not have changed

  Scenario: PIN mismatch during setup
    When I click the sidebar kiosk lock button
    And I set a 4-digit PIN "1234"
    And I confirm the PIN "5678"
    Then I should see "PINs do not match"
