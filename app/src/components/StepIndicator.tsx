type Props = {
  step: number;
};

const steps = [
  "Registro",
  "Funcionários",
  "Serviços",
  "Fotos",
  "NF's",
];

export default function StepIndicator({ step }: Props) {
  return (
    <div className="rdo-steps">
      {steps.map((label, index) => {
        const number = index + 1;
        const active = number === step;
        const completed = number < step;

        return (
          <div
            key={number}
            className={`rdo-step ${active ? "is-active" : ""} ${
              completed ? "is-completed" : ""
            }`}
          >
            <div className="rdo-step-circle">{number}</div>
            <div className="rdo-step-label">{label}</div>
          </div>
        );
      })}
    </div>
  );
}