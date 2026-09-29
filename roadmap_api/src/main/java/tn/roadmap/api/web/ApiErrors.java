package tn.roadmap.api.web;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;

/** Erreurs au format RFC 9457 (application/problem+json) avec un message lisible dans "detail". */
@RestControllerAdvice
public class ApiErrors {

    @ExceptionHandler(ResponseStatusException.class)
    ProblemDetail status(ResponseStatusException e) {
        return ProblemDetail.forStatusAndDetail(e.getStatusCode(), e.getReason() == null ? "Erreur" : e.getReason());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ProblemDetail tooLarge(MaxUploadSizeExceededException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONTENT_TOO_LARGE,
                "Photo trop volumineuse (20 Mo maximum). Réduisez la résolution de l'appareil photo et réessayez.");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ProblemDetail badValue(IllegalArgumentException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Valeur invalide : " + e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail invalid(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + " : " + f.getDefaultMessage()).findFirst().orElse("Requête invalide");
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, msg);
    }
}
