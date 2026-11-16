package com.journeygo.modules.tour.repository;

import com.journeygo.modules.tour.entity.GuestType;
import com.journeygo.modules.tour.entity.GuestTypeConfig;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GuestTypeConfigRepository extends JpaRepository<GuestTypeConfig, GuestType> {
}
