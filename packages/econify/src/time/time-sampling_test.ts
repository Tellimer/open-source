/**
 * Tests for time sampling functionality
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import {
  convertWageTimeScale,
  processWageTimeSeries,
  resampleTimeSeries,
  simpleTimeConversion,
  type TimeSeries,
} from "./time-sampling.ts";

Deno.test("simpleTimeConversion - basic conversions", () => {
  // Hour to month conversion
  const hourlyWage = 25; // $25/hour
  const monthlyWage = simpleTimeConversion(hourlyWage, "hour", "month");
  // 25 * (365*24/12) = 25 * 730 = 18,250
  assertEquals(Math.round(monthlyWage), 18250);

  // Weekly to monthly
  const weeklyWage = 1000; // $1000/week
  const monthlyFromWeekly = simpleTimeConversion(weeklyWage, "week", "month");
  // 1000 * (52/12) = 1000 * 4.33 = 4,333
  assertEquals(Math.round(monthlyFromWeekly), 4333);

  // Yearly to monthly
  const yearlyWage = 60000; // $60,000/year
  const monthlyFromYearly = simpleTimeConversion(yearlyWage, "year", "month");
  // 60000 / 12 = 5,000
  assertEquals(monthlyFromYearly, 5000);
});

Deno.test("convertWageTimeScale - hourly wage handling", () => {
  // Hourly wage with standard work hours (40 hrs/week * 52 weeks = 2080 hrs/year)
  const hourlyWage = 30; // $30/hour

  // To yearly (assuming 2080 work hours)
  const yearlyFromHourly = convertWageTimeScale(
    hourlyWage,
    "hour",
    "year",
    "hourly",
  );
  assertEquals(yearlyFromHourly, 30 * 2080); // 62,400

  // To monthly (2080 / 12 = 173.33 hours/month)
  const monthlyFromHourly = convertWageTimeScale(
    hourlyWage,
    "hour",
    "month",
    "hourly",
  );
  assertEquals(Math.round(monthlyFromHourly), Math.round(30 * 2080 / 12)); // 5,200
});

Deno.test("resampleTimeSeries - upsampling", () => {
  // Yearly data points
  const yearlyData: TimeSeries[] = [
    { date: new Date("2020-01-01"), value: 50000 },
    { date: new Date("2021-01-01"), value: 52000 },
    { date: new Date("2022-01-01"), value: 54000 },
  ];

  // Upsample to monthly with linear interpolation
  const monthlyData = resampleTimeSeries(yearlyData, "month", {
    method: "linear",
  });

  // Should have more data points
  assertEquals(monthlyData.length > yearlyData.length, true);

  // First point should be the same
  assertEquals(monthlyData[0].value, 50000);

  // Check that interpolation is working
  const midPoint = monthlyData[Math.floor(monthlyData.length / 2)];
  assertEquals(midPoint.value > 50000 && midPoint.value < 54000, true);
});

Deno.test("resampleTimeSeries - downsampling", () => {
  // Daily data points (simulate a month of daily wages)
  const dailyData: TimeSeries[] = [];
  for (let i = 0; i < 30; i++) {
    dailyData.push({
      date: new Date(2024, 0, i + 1), // January 2024
      value: 200 + Math.random() * 50, // $200-250 per day
    });
  }

  // Downsample to monthly with average
  const monthlyData = resampleTimeSeries(dailyData, "month", {
    method: "average",
  });

  // Should have fewer data points
  assertEquals(monthlyData.length < dailyData.length, true);
  assertEquals(monthlyData.length, 1); // One month

  // Value should be average of daily values
  const expectedAvg = dailyData.reduce((sum, d) => sum + d.value, 0) /
    dailyData.length;
  assertEquals(Math.abs(monthlyData[0].value - expectedAvg) < 1, true);
});

Deno.test("processWageTimeSeries - mixed time scales", () => {
  const mixedWages = [
    {
      date: new Date("2024-01-01"),
      value: 25,
      unit: "USD/Hour",
      country: "USA",
    },
    {
      date: new Date("2024-01-01"),
      value: 4000,
      unit: "EUR/Month",
      country: "DEU",
    },
    {
      date: new Date("2024-01-01"),
      value: 60000,
      unit: "GBP/Year",
      country: "GBR",
    },
  ];

  // Convert all to monthly
  const monthlyWages = processWageTimeSeries(mixedWages, "month");

  assertEquals(monthlyWages.length, 3);

  // Check conversions
  const usaWage = monthlyWages.find((w) => w.country === "USA");
  assertExists(usaWage);
  assertEquals(usaWage.unit, "USD/month");
  // 25 * (365*24/12) = ~18,250
  assertEquals(Math.abs(usaWage.value - 18250) < 100, true);

  const deuWage = monthlyWages.find((w) => w.country === "DEU");
  assertExists(deuWage);
  assertEquals(deuWage.unit, "EUR/month"); // Already monthly, but case normalized
  assertEquals(deuWage.value, 4000);

  const gbrWage = monthlyWages.find((w) => w.country === "GBR");
  assertExists(gbrWage);
  assertEquals(gbrWage.unit, "GBP/month");
  // 60000 / 12 = 5000
  assertEquals(gbrWage.value, 5000);
});

Deno.test("resampleTimeSeries - different methods", () => {
  const data: TimeSeries[] = [
    { date: new Date("2024-01-01"), value: 100 },
    { date: new Date("2024-01-02"), value: 200 },
    { date: new Date("2024-01-03"), value: 300 },
    { date: new Date("2024-01-04"), value: 400 },
  ];

  // Test different downsampling methods
  const avgResult = resampleTimeSeries(data, "week", { method: "average" });
  const sumResult = resampleTimeSeries(data, "week", { method: "sum" });
  const endResult = resampleTimeSeries(data, "week", {
    method: "end_of_period",
  });
  const startResult = resampleTimeSeries(data, "week", {
    method: "start_of_period",
  });

  assertEquals(avgResult[0].value, 250); // (100+200+300+400)/4
  assertEquals(sumResult[0].value, 1000); // 100+200+300+400
  assertEquals(endResult[0].value, 400); // Last value
  assertEquals(startResult[0].value, 100); // First value
});

Deno.test("time conversion edge cases", () => {
  // Same time scale
  assertEquals(simpleTimeConversion(1000, "month", "month"), 1000);

  // Zero value
  assertEquals(simpleTimeConversion(0, "hour", "year"), 0);

  // Negative value (debt/loss)
  assertEquals(simpleTimeConversion(-500, "month", "year"), -6000);
});

Deno.test("wage time series with real-world data", () => {
  // Simulate real wage data with different reporting frequencies
  const wageData = [
    {
      date: new Date("2024-01-01"),
      value: 30.50,
      unit: "USD/Hour",
      country: "CAN",
    },
    {
      date: new Date("2024-01-01"),
      value: 1500,
      unit: "AUD/Week",
      country: "AUS",
    },
    {
      date: new Date("2024-01-01"),
      value: 85000,
      unit: "CNY/Year",
      country: "CHN",
    },
    {
      date: new Date("2024-01-01"),
      value: 3200,
      unit: "EUR/Month",
      country: "DEU",
    },
  ];

  const normalized = processWageTimeSeries(wageData, "month");

  // All should be converted to monthly
  normalized.forEach((wage) => {
    assertEquals(wage.unit.toLowerCase().includes("month"), true);
  });

  // Check reasonable ranges (monthly wages should be in thousands)
  normalized.forEach((wage) => {
    assertEquals(
      wage.value > 1000,
      true,
      `${wage.country} wage too low: ${wage.value}`,
    );
    assertEquals(
      wage.value < 50000,
      true,
      `${wage.country} wage too high: ${wage.value}`,
    );
  });
});
