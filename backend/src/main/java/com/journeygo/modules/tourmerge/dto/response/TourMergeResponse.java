package com.journeygo.modules.tourmerge.dto.response;

import com.journeygo.modules.tourmerge.entity.TourMerge;
import com.journeygo.modules.tourmerge.entity.enums.TourMergeStatus;
import lombok.Builder;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

@Builder
public record TourMergeResponse(
        Long id,
        Long hostSlotId,
        Long hostTourId,
        String hostTourTitle,
        Long guestSlotId,
        Long guestTourId,
        String guestTourTitle,
        Long initiatorProviderId,
        String initiatorProviderName,
        Long targetProviderId,
        String targetProviderName,
        LocalDate departureDate,
        LocalTime mergedDepartureTime,
        String mergedMeetingPoint,
        Integer mergedCapacity,
        Integer hostBookedCount,
        Integer guestBookedCount,
        Integer totalBookedCount,
        boolean targetConfirmed,
        Instant targetConfirmedAt,
        TourMergeStatus status,
        Long approvedByModId,
        String note,
        String rejectReason,
        Instant createdAt,
        Instant updatedAt
) {
    public static TourMergeResponse fromEntity(TourMerge m, String initiatorName, String targetName) {
        int hostBooked = m.getHostSlot() != null && m.getHostSlot().getBookedCount() != null
                ? m.getHostSlot().getBookedCount() : 0;
        int guestBooked = m.getGuestSlot() != null && m.getGuestSlot().getBookedCount() != null
                ? m.getGuestSlot().getBookedCount() : 0;
        return TourMergeResponse.builder()
                .id(m.getId())
                .hostSlotId(m.getHostSlot() != null ? m.getHostSlot().getId() : null)
                .hostTourId(m.getHostSlot() != null && m.getHostSlot().getTour() != null
                        ? m.getHostSlot().getTour().getTourId() : null)
                .hostTourTitle(m.getHostSlot() != null && m.getHostSlot().getTour() != null
                        ? m.getHostSlot().getTour().getTitle() : null)
                .guestSlotId(m.getGuestSlot() != null ? m.getGuestSlot().getId() : null)
                .guestTourId(m.getGuestSlot() != null && m.getGuestSlot().getTour() != null
                        ? m.getGuestSlot().getTour().getTourId() : null)
                .guestTourTitle(m.getGuestSlot() != null && m.getGuestSlot().getTour() != null
                        ? m.getGuestSlot().getTour().getTitle() : null)
                .initiatorProviderId(m.getInitiatorProvider() != null ? m.getInitiatorProvider().getId() : null)
                .initiatorProviderName(initiatorName)
                .targetProviderId(m.getTargetProvider() != null ? m.getTargetProvider().getId() : null)
                .targetProviderName(targetName)
                .departureDate(m.getDepartureDate())
                .mergedDepartureTime(m.getMergedDepartureTime())
                .mergedMeetingPoint(m.getMergedMeetingPoint())
                .mergedCapacity(m.getMergedCapacity())
                .hostBookedCount(hostBooked)
                .guestBookedCount(guestBooked)
                .totalBookedCount(hostBooked + guestBooked)
                .targetConfirmed(m.isTargetConfirmed())
                .targetConfirmedAt(m.getTargetConfirmedAt())
                .status(m.getStatus())
                .approvedByModId(m.getApprovedByMod() != null ? m.getApprovedByMod().getId() : null)
                .note(m.getNote())
                .rejectReason(m.getRejectReason())
                .createdAt(m.getCreatedAt())
                .updatedAt(m.getUpdatedAt())
                .build();
    }
}
