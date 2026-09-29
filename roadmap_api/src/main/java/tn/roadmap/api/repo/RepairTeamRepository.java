package tn.roadmap.api.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.roadmap.api.domain.RepairTeam;

import java.util.List;
import java.util.Optional;

public interface RepairTeamRepository extends JpaRepository<RepairTeam, String> {
}
