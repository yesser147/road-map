package tn.roadmap.api.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.roadmap.api.domain.Asset;

import java.util.List;
import java.util.Optional;

public interface AssetRepository extends JpaRepository<Asset, String> {
}
