import unittest
from types import SimpleNamespace
from pydantic import ValidationError
from app.schemas.tour_finance import TourFinanceConfig
from app.services.tour_finance import calculate_commission, recommended_price, summarize_departure


def booking(**values):
    data = dict(partner_code="SALE", adults_count=2, children_count=1, infants_count=1,
                guests_count=4, total_amount=10000000, status="confirmed", payment_status="paid")
    return SimpleNamespace(**(data | values))


class FinanceTests(unittest.TestCase):
    def test_legacy_default(self):
        self.assertEqual(calculate_commission(TourFinanceConfig(), booking(), 3), 1440000)

    def test_partner_override_and_own_percentage(self):
        config = TourFinanceConfig(commission_type="percentage", commission_value=10,
            own_commission=dict(commission_value=5),
            partner_overrides=[dict(partner_code=" sale ", commission_type="per_booking", commission_value=300000)])
        result = summarize_departure(config, [booking()], 3, actual_cost=6000000)
        self.assertEqual(result["partner_commission"], 300000)
        self.assertEqual(result["own_commission"], 500000)
        self.assertEqual(result["profit"], 3200000)
        restored = TourFinanceConfig(**config.model_dump())
        self.assertEqual(calculate_commission(restored, booking(partner_code="OTHER"), 3), 1000000)

    def test_direct_booking_only_own(self):
        config = TourFinanceConfig(own_commission=dict(commission_type="per_booking", commission_value=200000))
        result = summarize_departure(config, [booking(partner_code=None)], 2)
        self.assertEqual(result["partner_commission"], 0)
        self.assertEqual(result["own_commission"], 200000)

    def test_guest_flags(self):
        config = TourFinanceConfig(commission_type="per_guest", commission_value=100000,
                                   commission_children=False, commission_infants=True)
        self.assertEqual(calculate_commission(config, booking(), 4), 300000)

    def test_recognition_and_actual_zero_cost(self):
        config = TourFinanceConfig(revenue_basis="paid", fixed_cost=100000,
            own_commission=dict(commission_type="per_booking", commission_value=100000))
        result = summarize_departure(config, [booking(status="pending"), booking(status="cancelled"),
            booking(payment_status="unpaid"), booking(partner_code=None)], 1, actual_cost=0)
        self.assertEqual(result["revenue"], 10000000)
        self.assertEqual(result["cost"], 0)
        self.assertEqual(result["own_commission"], 100000)

    def test_recommended_price_combines_rates(self):
        config = TourFinanceConfig(net_cost_adult=800000, commission_type="percentage",
            commission_value=10, own_commission=dict(commission_value=10))
        self.assertEqual(recommended_price(config, 1)["adult_price"], 1000000)

    def test_invalid_configurations(self):
        invalid = [
            dict(commission_value=-1), dict(commission_value=float("nan")),
            dict(commission_type="percentage", commission_value=100),
            dict(commission_type="percentage", commission_value=60, own_commission=dict(commission_value=40)),
            dict(partner_overrides=[dict(partner_code="  ")]),
            dict(partner_overrides=[dict(partner_code="sale"), dict(partner_code=" SALE ")]),
            dict(partner_overrides=[dict(partner_code="sale", commission_value=95)], own_commission=dict(commission_value=5)),
        ]
        for values in invalid:
            with self.subTest(values=values), self.assertRaises(ValidationError):
                TourFinanceConfig(**values)


if __name__ == "__main__":
    unittest.main()
