package com.faro.backend.config;

import org.n52.jackson.datatype.jts.JtsModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JacksonConfig {
    @Bean
    public JtsModule jtsModule() {
        // Intercepta las entidades espaciales y las formatea como GeoJSON
        return new JtsModule();
    }
}