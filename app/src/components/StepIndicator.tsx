type StepIndicatorProps = {
  currentStep: number;
};

const steps = [
  "Registro",
  "Funcionários",
  "NF's",
  "Serviços",
  "Fotos",
];

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="rdo-step-indicator">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = currentStep === stepNumber;
        const isCompleted = currentStep > stepNumber;

        return (
          <div
            key={step}
            style={{
              display: "flex",
              alignItems: "center",
              flex: 1,
              minWidth: 0,
              gap: 12,
            }}
          >
            <div
              className={`rdo-step-item ${
                isActive ? "active" : isCompleted ? "completed" : ""
              }`}
            >
              <div className="rdo-step-circle">{stepNumber}</div>
              <div className="rdo-step-label">{step}</div>
            </div>

            {index < steps.length - 1 && (
              <div
                className={`rdo-step-line ${
                  currentStep > stepNumber ? "active" : ""
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}