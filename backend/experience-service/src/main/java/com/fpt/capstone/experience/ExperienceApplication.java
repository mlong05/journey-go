package com.fpt.capstone.experience;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"com.fpt.capstone"})
public class ExperienceApplication {
    public static void main(String[] args) {
        SpringApplication.run(ExperienceApplication.class, args);
    }
}