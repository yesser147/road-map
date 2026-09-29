package tn.roadmap.api.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.roadmap.api.domain.CitizenReport;

import java.util.List;
import java.util.Optional;

public interface CitizenReportRepository extends JpaRepository<CitizenReport, String> {
    List<CitizenReport> findByAuthorIdOrderByReceivedAtDesc(Long authorId);

    List<CitizenReport> findAllByOrderByReceivedAtDesc();

    Optional<CitizenReport> findFirstByAuthorIdAndPhotoHash(Long authorId, String photoHash);
}
