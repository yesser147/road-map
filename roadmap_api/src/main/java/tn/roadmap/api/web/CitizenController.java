package tn.roadmap.api.web;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tn.roadmap.api.domain.DefectType;
import tn.roadmap.api.service.AuthService;
import tn.roadmap.api.service.ReportService;
import tn.roadmap.api.web.Dtos.MyReportDto;
import tn.roadmap.api.web.Dtos.ReportDto;

import java.util.List;

/** Espace citoyen : signaler une dégradation (photo + position) et suivre ses signalements. */
@Validated
@RestController
@RequestMapping("/api/v1/citizen")
public class CitizenController {

    private final AuthService auth;
    private final ReportService reports;

    public CitizenController(AuthService auth, ReportService reports) {
        this.auth = auth;
        this.reports = reports;
    }

    @PostMapping(value = "/reports", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ReportDto submit(Authentication a,
                            @RequestPart("photo") MultipartFile photo,
                            @RequestParam @DecimalMin("-90") @DecimalMax("90") double lat,
                            @RequestParam @DecimalMin("-180") @DecimalMax("180") double lng,
                            @RequestParam(required = false) String description,
                            @RequestParam(required = false) String type) {
        DefectType hint = type == null || type.isBlank() ? null : DefectType.of(type);
        return reports.submit(auth.current(a), photo, lat, lng, description, hint);
    }

    @GetMapping("/reports")
    public List<MyReportDto> mine(Authentication a) {
        return reports.mine(auth.current(a));
    }
}
