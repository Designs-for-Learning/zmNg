Feature: Full Application Walkthrough
  As a ZoneMinder user
  I want to navigate through all application screens and interact with features
  So that I can verify the entire application works correctly

  Background:
    Given I am logged into zmNg

  Scenario: Dashboard - Add and verify widget
    When I navigate to the "Dashboard" page
    Then I should see the page heading "Dashboard"
    When I open the Add Widget dialog
    And I select the "Timeline" widget type
    And I enter widget title "Test Timeline"
    And I click the Add button in the dialog
    Then the widget "Test Timeline" should appear on the dashboard

  Scenario: Monitors - View and interact with monitors
    When I navigate to the "Monitors" page
    Then I should see the page heading "Monitors"
    And I should see at least 1 monitor cards
    When I click into the first monitor detail page
    Then I should see the monitor player
    When I navigate back
    Then I should see the monitor grid

  Scenario: Montage - View camera grid and controls
    When I navigate to the "Montage" page
    Then I should see the page heading "Montage"
    And I should see the montage interface

  Scenario: Events - Browse and view event details
    When I navigate to the "Events" page
    Then I should see the page heading "Events"
    And I should see events list or empty state
    When I click into the first event if events exist
    And I navigate back if I clicked into an event
    Then I should be on the "Events" page

  Scenario: Event Montage - View event grid
    When I navigate to the "Event Montage" page
    Then I should see the page heading "Event Montage"

  Scenario: Timeline - View and interact with timeline
    When I navigate to the "Timeline" page
    Then I should see the page heading "Timeline"
    And I should see timeline interface elements

  Scenario: Notifications - View notification settings and history
    When I navigate to the "Notifications" page
    Then I should see the page heading "Notifications"
    And I should see notification interface elements

  Scenario: Profiles - View and interact with profiles
    When I navigate to the "Profiles" page
    Then I should see the page heading "Profiles"
    And I should see at least 1 profile cards
    And I should see the active profile indicator
    And I should see profile management buttons

  Scenario: Settings - View and verify settings sections
    When I navigate to the "Settings" page
    Then I should see the page heading "Settings"
    And I should see settings interface elements

  Scenario: Server - View server information and status
    When I navigate to the "Server" page
    Then I should see the page heading "Server"
    And I should see server information displayed

  Scenario: Logs - View and interact with application logs
    When I navigate to the "Logs" page
    Then I should see the page heading "Logs"
    And I should see log entries or empty state
    And I should see log control elements
