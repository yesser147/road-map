package tn.roadmap.api.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.roadmap.api.domain.MonthlyStat;

import java.util.List;
import java.util.Optional;

public interface MonthlyStatRepository extends JpaRepository<MonthlyStat, String> {
    List<MonthlyStat> findAllByOrderByMonthAsc();
}
