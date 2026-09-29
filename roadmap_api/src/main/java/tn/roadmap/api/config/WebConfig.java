package tn.roadmap.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

/** Sert les photos envoyées par les citoyens sous /media/uploads/** (illustrations de démo : /media/seed/**). */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final Path uploads;

    public WebConfig(@Value("${roadmap.uploads-dir}") String uploadsDir) {
        this.uploads = Path.of(uploadsDir).toAbsolutePath().normalize();
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/media/uploads/**").addResourceLocations(uploads.toUri().toString());
    }
}
