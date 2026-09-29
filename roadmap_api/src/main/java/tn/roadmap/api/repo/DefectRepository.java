package tn.roadmap.api.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.roadmap.api.domain.Defect;

import java.util.List;
import java.util.Optional;

public interface DefectRepository extends JpaRepository<Defect, String> {
}
