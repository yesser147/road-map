package tn.roadmap.api.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.roadmap.api.domain.AppUser;

import java.util.List;
import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByEmailIgnoreCase(String email);
}
