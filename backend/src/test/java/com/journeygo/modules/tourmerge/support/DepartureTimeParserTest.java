package com.journeygo.modules.tourmerge.support;

import org.junit.jupiter.api.Test;

import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.*;

class DepartureTimeParserTest {

    @Test
    void parse_supportsStandardAndVietnameseFormats() {
        assertEquals(LocalTime.of(8, 0), DepartureTimeParser.parse("08:00").orElseThrow());
        assertEquals(LocalTime.of(8, 30), DepartureTimeParser.parse("8:30 sáng").orElseThrow());
        assertEquals(LocalTime.of(14, 15), DepartureTimeParser.parse("02:15 chiều").orElseThrow());
        assertEquals(LocalTime.of(19, 0), DepartureTimeParser.parse("7h tối").orElseThrow());
        assertEquals(LocalTime.of(7, 45), DepartureTimeParser.parse("7h45").orElseThrow());
        assertEquals(LocalTime.of(0, 30), DepartureTimeParser.parse("12:30 AM").orElseThrow());
        assertTrue(DepartureTimeParser.parse("   ").isEmpty());
        assertTrue(DepartureTimeParser.parse("không rõ").isEmpty());
    }

    @Test
    void minutesDiff_computesAbsoluteDifference() {
        assertEquals(30, DepartureTimeParser.minutesDiff(LocalTime.of(8, 0), LocalTime.of(8, 30)));
        assertEquals(45, DepartureTimeParser.minutesDiff(LocalTime.of(9, 0), LocalTime.of(8, 15)));
    }
}
